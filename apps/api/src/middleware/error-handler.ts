import { NextFunction, Request, Response } from 'express';
import {
  BaseError,
  DatabaseError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError,
} from 'sequelize';

// Codigos de error de Postgres que son culpa del payload y no del servidor.
const PG_CHECK_VIOLATION = '23514';
const PG_NOT_NULL_VIOLATION = '23502';

interface PgError extends Error {
  code?: string;
  constraint?: string;
}

const pgErrorOf = (err: DatabaseError): PgError => (err.parent ?? err.original ?? err) as PgError;

/**
 * Ultimo eslabon de la cadena. Sin esto cualquier error que no atrape el
 * controller cae en el handler default de Express, que responde HTML: el front
 * lee `data.error.message`, no lo encuentra y muestra un texto generico. El
 * resultado practico es un fallo mudo, imposible de diagnosticar desde la UI.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof UniqueConstraintError) {
    res.status(409).json({
      error: { code: 'ALREADY_EXISTS', message: 'Ese registro ya existe.' },
    });
    return;
  }

  if (err instanceof ForeignKeyConstraintError) {
    res.status(400).json({
      error: { code: 'INVALID_REFERENCE', message: 'Referencia inexistente en los datos enviados.' },
    });
    return;
  }

  if (err instanceof ValidationError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada invalidos',
        fields: Object.fromEntries(err.errors.map((e) => [e.path ?? '_', [e.message]])),
      },
    });
    return;
  }

  if (err instanceof DatabaseError) {
    const pg = pgErrorOf(err);
    if (pg.code === PG_CHECK_VIOLATION || pg.code === PG_NOT_NULL_VIOLATION) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          // El nombre del constraint es la unica pista util y no filtra datos.
          message: `La base rechazo los datos enviados (${pg.constraint ?? pg.code}).`,
        },
      });
      return;
    }
  }

  const message = err instanceof BaseError || err instanceof Error ? err.message : String(err);
  console.error('[error-handler]', message, err instanceof Error ? err.stack : '');

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' },
  });
}
