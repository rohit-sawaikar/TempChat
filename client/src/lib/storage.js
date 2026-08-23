import { generateUsername } from '../utils/generateUsername'

const KEY = 'tempchat_user'

export const saveUsername = (username) => {
  sessionStorage.setItem(KEY, username)
}

export const getSavedUsername = () => {
  const saved = sessionStorage.getItem(KEY)
  if (saved) return saved

  const generated = generateUsername()
  saveUsername(generated)
  return generated
}