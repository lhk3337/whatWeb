import { getSession } from "next-auth/client";
import { NextApiRequest, NextApiResponse } from "next";
import { closeMongoDB, collectionMongoDB } from "libs/mongodb";
import { hashPassword, verifyPassword } from "libs/auth";
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return;
  }
  const session = await getSession({ req: req });
  if (!session) {
    res.status(401).json({ message: "Not authenticated!" });
    return;
  }
  const userEmail = session.user?.email;
  const oldPassword = req.body.oldPassword;
  const newPassowrd = req.body.newPassword;

  const user = await (await collectionMongoDB("users")).findOne({ email: userEmail });
  if (!user) {
    res.status(404).json({ message: "User not found." });
    await closeMongoDB();
    return;
  }
  const currentPassword = user.password;
  const passwordsAreEqual = await verifyPassword(oldPassword, currentPassword);
  if (!passwordsAreEqual) {
    res.status(403).json({ message: "Invalid password." });
    await closeMongoDB();
    return;
  }
  const hashedPassword = await hashPassword(newPassowrd);
  await (await collectionMongoDB("users")).updateOne({ email: userEmail }, { $set: { password: hashedPassword } });
  await closeMongoDB();
  res.status(200).json({ ok: true });
}

export default handler;
