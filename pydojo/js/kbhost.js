// One shared on-screen keyboard instance, moved into whichever screen needs it.
import { PyKeyboard } from './keyboard.js';

let kb = null;
export function getKeyboard() {
  if (!kb) kb = new PyKeyboard();
  return kb;
}
