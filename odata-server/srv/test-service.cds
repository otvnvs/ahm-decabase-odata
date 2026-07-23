using { com.test as db } from '../db/schema';

service TestService @(requires: 'authenticated-user') {
  
  entity Data @(restrict: [
    { grant: '*',  to: 'admin' },
    { grant: 'READ', to: 'authenticated-user' }
  ]) as projection on db.Data;

  entity Products @(restrict: [
    { grant: '*',  to: 'admin' },
    { grant: 'READ', to: 'authenticated-user' }
  ]) as projection on db.Products;

  entity OrderItems @(restrict: [
    { grant: '*',  to: 'admin' },
    { grant: 'READ', to: 'authenticated-user' }
  ]) as projection on db.OrderItems;

}

