/**
 * Host half of the bibibobo bundle.
 *
 * The whole feature lives in the browser: bibibobo synthesizes audio in the
 * page, and the text to speak arrives through the Chat slot props. This Host
 * entry exists so the bundle has a plugin row and a config surface; it
 * registers nothing and needs no services.
 */
export function apply() {}
