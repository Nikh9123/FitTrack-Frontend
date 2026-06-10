export const UPGRADE_UPI_ID = "veera@sdeashirvad";
export const UPGRADE_AMOUNT_INR = 499;

/** UPI deep link string for QR generation */
export function buildUpiPaymentString(): string {
  return `upi://pay?pa=${UPGRADE_UPI_ID}&pn=Veera&am=${UPGRADE_AMOUNT_INR}&cu=INR`;
}
