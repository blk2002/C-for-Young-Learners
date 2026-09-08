(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.WB = root.WB || {}; root.WB.contentUI = factory(); }
})(typeof self !== 'undefined' ? self : this, function () { return { render: function () {} }; });
