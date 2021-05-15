module.exports = (f) =>
  Object.assign((...args) => f(...args), {
    cancel: jest.fn(),
  })
