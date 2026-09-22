import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RequestWithUser } from '../types/auth.types';

/**
 * Only the owner of the business may do what this guards (change payment settings, verify or
 * refuse a payment). Today every member is an owner; the day employees exist, the check is already
 * in place. Use after BusinessContextGuard.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (request.user?.role !== 'owner') {
      throw new ForbiddenException('Seul le propriétaire du commerce peut effectuer cette action.');
    }
    return true;
  }
}
