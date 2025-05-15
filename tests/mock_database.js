/**
 * Mock database module for testing purposes.
 */
const query = jest.fn();

const reset = () => {
  query.mockReset();
};

module.exports = {
  query,
  reset,
};
