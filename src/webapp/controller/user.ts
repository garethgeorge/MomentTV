export const login = async (username: string, password: string | null) => {
  await new Promise((accept) => {
    setTimeout(accept, 2000);
  });
}