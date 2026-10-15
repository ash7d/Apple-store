import { connectToDatabase } from "../src/lib/db";
import User from "../src/models/User";

async function promoteMerchant() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      "Provide the email address of an existing account: pnpm --filter @workspace/apple-store run promote-merchant -- owner@example.com",
    );
  }

  await connectToDatabase();
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { role: "merchant" } },
    { new: true, runValidators: true },
  ).select("_id email role");
  if (!user) throw new Error(`No existing account was found for ${email}. Create the account first.`);

  process.stdout.write(`Merchant access enabled for ${user.email}.\n`);
  await User.db?.close();
}

promoteMerchant().catch(async (error: unknown) => {
  process.stderr.write(
    `Merchant promotion failed: ${error instanceof Error ? error.message : "unknown error"}\n`,
  );
  await User.db?.close();
  process.exitCode = 1;
});
