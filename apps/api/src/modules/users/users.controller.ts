import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { User } from '../../db';
import { getOfferStats } from './users.service';
import { listCasesByUser, listPublicCasesByUser } from '../rescue/cases/cases.service';
import { isAdminEmail } from '../moderation/admin/admin.roles';

const pushTokenSchema = z.object({
  token: z.string().min(1),
});

// El rol lo otorga el panel de admin, no el propio usuario. isVet y vetLicense
// se IGNORAN en vez de rechazarse: durante la ventana de deploy el frontend
// viejo los sigue mandando y un 400 le romperia el guardado del perfil. Zod
// descarta las claves desconocidas por defecto, que es justo lo que hace falta.
const patchMeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
});

const notificationLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().int().min(1).max(100),
});

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.id, {
      // isVet y vetLicense entran al SELECT porque el perfil los muestra en
      // solo lectura: sin ellos salian undefined y el sello se perdia al
      // recargar la pagina.
      attributes: [
        'id',
        'email',
        'name',
        'emailVerified',
        'isVet',
        'vetLicense',
        'notificationLat',
        'notificationLng',
        'notificationRadiusKm',
        'createdAt',
      ],
    });
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      isAdmin: isAdminEmail(user.email, process.env['ADMIN_EMAILS']),
      isVet: user.isVet,
      vetLicense: user.vetLicense,
      notificationLat: user.notificationLat,
      notificationLng: user.notificationLng,
      notificationRadiusKm: user.notificationRadiusKm,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
};

export const patchMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = patchMeSchema.parse(req.body);
    const user = await User.findByPk(req.user!.id);
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
      return;
    }
    if (input.name !== undefined) user.name = input.name;
    await user.save();
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      isAdmin: isAdminEmail(user.email, process.env['ADMIN_EMAILS']),
      isVet: user.isVet,
      vetLicense: user.vetLicense,
      notificationLat: user.notificationLat,
      notificationLng: user.notificationLng,
      notificationRadiusKm: user.notificationRadiusKm,
      createdAt: user.createdAt,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de entrada invalidos',
          fields: err.flatten().fieldErrors,
        },
      });
      return;
    }
    next(err);
  }
};

export const savePushToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token } = pushTokenSchema.parse(req.body);
    await User.update({ pushToken: token }, { where: { id: req.user!.id } });
    res.status(204).end();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Token invalido' } });
      return;
    }
    next(err);
  }
};

export const deleteNotificationLocation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await User.update(
      { notificationLat: null, notificationLng: null, notificationRadiusKm: null },
      { where: { id: req.user!.id } },
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const patchNotificationLocation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { lat, lng, radiusKm } = notificationLocationSchema.parse(req.body);
    await User.update(
      { notificationLat: lat, notificationLng: lng, notificationRadiusKm: radiusKm },
      { where: { id: req.user!.id } },
    );
    res.status(204).end();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Datos de entrada invalidos',
          fields: err.flatten().fieldErrors,
        },
      });
      return;
    }
    next(err);
  }
};

export const getMyCases = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const cases = await listCasesByUser(req.user!.id);
    res.json({ cases });
  } catch (err) {
    next(err);
  }
};

/**
 * Los casos de una persona para su perfil publico. Es publico a proposito: la
 * ficha de un caso ya muestra en abierto quien lo publico y quienes ayudaron,
 * asi que la lista al reves no expone nada nuevo.
 */
export const getUserCases = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const user = await User.findByPk(id, { attributes: ['id'] });
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
      return;
    }

    res.json(await listPublicCasesByUser(id));
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'isVet', 'createdAt'],
    });
    if (!user) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' } });
      return;
    }

    // Los contadores cuentan lo mismo que la lista de abajo muestra: si contaran
    // tambien los casos dados de baja por moderacion, el perfil diria 7 y listaria 5.
    const [cases, offers] = await Promise.all([
      listPublicCasesByUser(id),
      getOfferStats(id),
    ]);

    res.json({
      id: user.id,
      name: user.name,
      isVet: user.isVet,
      createdAt: user.createdAt,
      casesPublished: cases.published.length,
      casesVolunteered: cases.volunteered.length,
      offersAccepted: offers.offersAccepted,
      offersCompleted: offers.offersCompleted,
      // offersRejected no se expone: el registro es libre, asi que "cualquier
      // autenticado" es casi cualquiera, y un contador de rechazos ajeno
      // estigmatiza sin que nadie lo pida. getOfferStats lo sigue calculando
      // por si algun dia hay una pantalla propia del usuario que lo justifique.
    });
  } catch (err) {
    next(err);
  }
};
