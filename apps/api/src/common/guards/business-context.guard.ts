import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { RequestWithUser } from '../types/auth.types';

/**
 * Rejects requests whose JWT has no active business selected. Apply to every business-scoped
 * controller (products, inventory, sales, customers, credits, expenses, dashboard, ...).
 * This is what makes @CurrentBusiness() safe to use unconditionally in those controllers.
 */
@Injectable()
export class BusinessContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user?.businessId) {
      throw new ForbiddenException('Aucune entreprise active sur ce compte.');
    }
    return true;
  }
}
