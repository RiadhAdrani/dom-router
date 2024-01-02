export const isPathValid = (path: string): boolean => {
  // should start with a "/"

  return path.startsWith('/');
};
