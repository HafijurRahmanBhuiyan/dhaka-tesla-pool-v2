import {
  RideStatus,
  ALLOWED_RIDE_TRANSITIONS,
  StatusAuditEntry
} from '../models/ride.model';
import { AppError } from '../models/response.model';

export class RideStateMachine {
  private static auditLogs: StatusAuditEntry[] = [];

  /**
   * Evaluates whether a state transition is permitted by the explicit state machine.
   * Allowed graph:
   * REQUESTED       -> [MATCHED, ACCEPTED, CANCELLED]
   * MATCHED         -> [ACCEPTED, DRIVER_ARRIVED, CANCELLED]
   * ACCEPTED        -> [DRIVER_ARRIVED, CANCELLED]
   * DRIVER_ARRIVED  -> [STARTED, CANCELLED]
   * STARTED         -> [COMPLETED, CANCELLED]
   * COMPLETED       -> [] (Terminal)
   * CANCELLED       -> [] (Terminal)
   */
  public static canTransition(current: RideStatus, target: RideStatus): boolean {
    const allowed = ALLOWED_RIDE_TRANSITIONS[current] || [];
    return allowed.includes(target);
  }

  /**
   * Enforces transition rules. Throws AppError if illegal.
   */
  public static validateTransition(current: RideStatus, target: RideStatus): void {
    if (!this.canTransition(current, target)) {
      const allowedNext = ALLOWED_RIDE_TRANSITIONS[current] || [];
      const allowedText =
        allowedNext.length > 0
          ? allowedNext.map((s) => `'${s}'`).join(', ')
          : 'None (terminal state)';

      throw new AppError(
        400,
        'INVALID_STATE_TRANSITION',
        `Illegal state transition from '${current}' to '${target}'. Allowed transitions from '${current}': [${allowedText}].`,
        {
          current_status: current,
          attempted_status: target,
          allowed_transitions: allowedNext
        }
      );
    }
  }

  /**
   * Executes and audits a valid transition.
   */
  public static recordTransition(
    rideRequestId: string,
    current: RideStatus,
    target: RideStatus,
    actorId: string,
    actorRole: string,
    reason?: string
  ): StatusAuditEntry {
    this.validateTransition(current, target);

    const auditEntry: StatusAuditEntry = {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      ride_request_id: rideRequestId,
      old_status: current,
      new_status: target,
      actor_id: actorId,
      actor_role: actorRole,
      reason: reason || `Transitioned from ${current} to ${target}`,
      timestamp: new Date().toISOString()
    };

    this.auditLogs.unshift(auditEntry);
    return auditEntry;
  }

  public static getAuditHistory(rideRequestId?: string): StatusAuditEntry[] {
    if (rideRequestId) {
      return this.auditLogs.filter((log) => log.ride_request_id === rideRequestId);
    }
    return [...this.auditLogs];
  }

  public static getAllowedTransitions(status: RideStatus): readonly RideStatus[] {
    return ALLOWED_RIDE_TRANSITIONS[status] || [];
  }
}
