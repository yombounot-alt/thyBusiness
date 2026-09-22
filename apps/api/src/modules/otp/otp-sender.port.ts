export const OTP_SENDER = Symbol('OTP_SENDER');

/** Swappable behind OTP_DRIVER env var. Only a mock implementation exists for this MVP cycle. */
export interface OtpSenderPort {
  send(phone: string, code: string): Promise<void>;
}
