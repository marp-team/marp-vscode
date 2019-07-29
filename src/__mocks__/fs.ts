module.exports = {
  ...require.requireActual('fs'),

  // Mock file R/W
  unlink: jest.fn((_, cb) => cb(null)),
  writeFile: jest.fn((_, __, cb) => cb(null)),
}
