import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { z } from 'zod';
import { AuthGuard } from '../../common/auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../common/permissions.guard';
import type { AuthenticatedRequest } from '../../common/request-context';
import { PaymentsService } from './payments.service';

const PaySchema = z.object({
  billId: z.string().min(1),
  rail: z.string().min(1).default('ISO20022'),
});

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('bills')
  @RequirePermissions('payment:read')
  bills(@Req() req: AuthenticatedRequest) {
    return this.payments.listBills(req.principal!.tenantId);
  }

  @Get('receipts')
  @RequirePermissions('payment:read')
  receipts(@Req() req: AuthenticatedRequest) {
    return this.payments.listReceipts(req.principal!.tenantId);
  }

  @Post()
  @RequirePermissions('payment:execute')
  pay(@Req() req: AuthenticatedRequest, @Body() body: unknown) {
    const parsed = PaySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map(i => i.message).join('; '));
    }
    return this.payments.pay(
      req.principal!.tenantId,
      parsed.data.billId,
      parsed.data.rail,
    );
  }
}
