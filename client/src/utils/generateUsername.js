/**
 * generateUsername.js
 * ─────────────────────────────────────────────────────────────────
 * Generates a random, cool two-word username from curated word lists.
 * Replaces the old "Guest + alphanumeric" pattern.
 *
 * Usage:
 *   import { generateUsername } from '../utils/generateUsername'
 *   const name = generateUsername()  // e.g. "SilentFox", "NeonRider"
 * ─────────────────────────────────────────────────────────────────
 */

const ADJECTIVES = [
  'Shadow', 'Silent', 'Neon', 'Frosty', 'Solar', 'Lunar', 'Cosmic',
  'Crimson', 'Azure', 'Phantom', 'Hollow', 'Glitch', 'Storm', 'Onyx',
  'Pixel', 'Vapor', 'Iron', 'Obsidian', 'Velvet', 'Ember', 'Arctic',
  'Stealth', 'Dark', 'Vivid', 'Chrome', 'Ashen', 'Binary', 'Prism',
  'Nimbus', 'Flux', 'Void', 'Static', 'Hyper', 'Dusk', 'Dawn',
]

const NOUNS = [
  'Fox', 'Wolf', 'Nova', 'Echo', 'Rider', 'Hawk', 'Lynx', 'Viper',
  'Specter', 'Wraith', 'Cipher', 'Raven', 'Falcon', 'Pulse', 'Nexus',
  'Drift', 'Surge', 'Orbit', 'Comet', 'Byte', 'Node', 'Glitch', 'Haze',
  'Shard', 'Blaze', 'Core', 'Flux', 'Zero', 'Storm', 'Crest', 'Spike',
  'Titan', 'Ember', 'Ghost', 'Arrow',
]

/**
 * Returns a random element from an array.
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generates a random username like "ShadowFox" or "NeonRider".
 * Optionally appends a short numeric suffix to reduce collisions
 * when many users join simultaneously.
 *
 * @param {boolean} [withSuffix=false] - append a 2-digit random number
 * @returns {string}
 */
export function generateUsername(withSuffix = false) {
  const name = pick(ADJECTIVES) + pick(NOUNS)
  if (!withSuffix) return name
  const suffix = String(Math.floor(Math.random() * 90) + 10) // 10–99
  return name + suffix
}
