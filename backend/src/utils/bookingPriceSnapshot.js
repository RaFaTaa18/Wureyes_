// Keep a booking's original service price unless its service is explicitly changed.
export function resolveServicePriceSnapshot({
  existingServiceId,
  newServiceId,
  existingSnapshot,
  newServicePrice,
}) {
  const serviceChanged = String(existingServiceId) !== String(newServiceId);
  return serviceChanged ? newServicePrice : existingSnapshot;
}
