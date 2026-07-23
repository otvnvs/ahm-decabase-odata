namespace com.test;

using { managed } from '@sap/cds/common';

entity Data : managed {
  key ID : UUID;
  x      : Integer;
  y      : Integer;
}

entity Products : managed {
  key ID          : UUID;
  SKU             : String(40);
  Name            : String(255);
  Category        : String(100);
  Price           : Decimal(13, 2);
  StockCount      : Integer;
  IsDiscontinued  : Boolean;
  orderItems      : Composition of many OrderItems on orderItems.product = $self;
}

entity OrderItems {
  key ID          : UUID;
  product         : Association to Products;
  OrderNumber     : String(50);
  Quantity        : Integer;
  DeliveryDate    : Date;
}

