module.exports = function(Customer) {
  Customer.settings._customized = 'Customer';
  Customer.base.settings._customized = 'Base';
};
