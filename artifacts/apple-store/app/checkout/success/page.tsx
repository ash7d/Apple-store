import CheckoutConfirmation from "./confirmation";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const params = await searchParams;
  const sessionId = Array.isArray(params.session_id)
    ? params.session_id[0]
    : params.session_id;
  return <CheckoutConfirmation sessionId={sessionId ?? ""} />;
}
