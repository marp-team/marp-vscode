import { TextEncoder, TextDecoder } from 'util'

// TextEncoder and TextDecoder are exposed to global in Node.js and the browser.
// Jest VM for testing seems not to expose them to JSDOM.
// https://github.com/jsdom/jsdom/issues/2524#issuecomment-902027138
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
