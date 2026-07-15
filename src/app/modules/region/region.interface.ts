export interface IDeliveryZone {
  name: string; // delivery area within the region (e.g. "Agrabad")
  charge: number; // delivery charge (৳) for that area
}

export interface IRegion {
  id: number; // numeric, frontend-facing
  name: string;
  image?: string;
  description?: string;
  // Region-level delivery areas. Ordering is region-based now (no branch pick
  // at checkout): the customer chooses an area here and the charge follows.
  deliveryZones?: IDeliveryZone[];
  defaultDeliveryCharge?: number; // charge for areas not explicitly listed
  createdAt?: Date;
  updatedAt?: Date;
}
