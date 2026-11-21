var test = require('node:test');
var assert = require('node:assert/strict');

var inventory = require('../lib/inventory');
var orders = require('../lib/orders');

function product(stock, reserved) {
  return {
    id: 1,
    sku: 'SKU-1',
    name: 'Test Rice',
    hsn: '1006',
    price: 100,
    stock: stock,
    reserved: reserved
  };
}

test('allows quantity one when exactly one unit is sellable', function () {
  var products = [product(1, 0)];

  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 1 }]), { ok: true });
});

test('CURRENT BEHAVIOUR: check rejects quantity two and accepts quantity zero with one sellable unit', function () {
  var products = [product(1, 0)];

  assert.equal(inventory.check(products, [{ id: 1, qty: 2 }]).ok, false);
  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 0 }]), { ok: true });
});

test('allows quantity one when stock four and reserved three leave one sellable', function () {
  var products = [product(4, 3)];

  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 1 }]), { ok: true });
});

test('cancelling a pending order restores stock without changing reserved stock', function () {
  var products = [product(5, 2)];
  var lineItems = [{
    id: 1,
    sku: 'SKU-1',
    name: 'Test Rice',
    hsn: '1006',
    price: 100,
    qty: 1
  }];
  var db = {
    products: products,
    orders: [{
      id: 1001,
      status: 'pending',
      paymentMode: 'cash',
      items: lineItems,
      total: 100
    }]
  };

  var beforeOrder = { stock: products[0].stock, reserved: products[0].reserved };
  inventory.reserve(products, lineItems);
  var afterReserve = { stock: products[0].stock, reserved: products[0].reserved };
  var result = orders.cancel(db, 1001, 'characterization');
  var afterCancel = { stock: products[0].stock, reserved: products[0].reserved };

  assert.deepEqual(beforeOrder, { stock: 5, reserved: 2 });
  assert.deepEqual(afterReserve, { stock: 4, reserved: 2 });
  assert.equal(result.ok, true);
  assert.deepEqual(afterCancel, { stock: 5, reserved: 2 });
});

test('allows the last sellable unit and restores its stock when a pending order is cancelled', function () {
  var products = [product(1, 0)];
  var lineItems = [{
    id: 1,
    sku: 'SKU-1',
    name: 'Test Rice',
    hsn: '1006',
    price: 100,
    qty: 1
  }];
  var db = {
    products: products,
    orders: [{
      id: 1001,
      status: 'pending',
      paymentMode: 'cash',
      items: lineItems,
      total: 100
    }]
  };

  assert.deepEqual(inventory.check(products, lineItems), { ok: true });
  inventory.reserve(products, lineItems);
  assert.equal(orders.cancel(db, 1001, 'regression').ok, true);
  assert.equal(products[0].stock, 1);
  assert.equal(orders.cancel(db, 1001, 'regression').ok, false);
  assert.equal(products[0].stock, 1);
});
