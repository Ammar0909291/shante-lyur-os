export enum InventoryMovementType {
  PURCHASE = 'PURCHASE',             // received from supplier
  PROCEDURE_USE = 'PROCEDURE_USE',   // consumed during appointment
  RETAIL_SALE = 'RETAIL_SALE',       // sold to client
  ADJUSTMENT = 'ADJUSTMENT',         // manual stock correction
  RETURN = 'RETURN',                 // returned to supplier or by client
  WASTE = 'WASTE',                   // expired or damaged
  TRANSFER = 'TRANSFER',             // between locations
}
