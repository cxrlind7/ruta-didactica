import Link from "next/link";

// Para cuando el checkout responde needsLogin (el correo ya tiene cuenta con
// contraseña, ver buyer.ts): manda a iniciar sesión y regresa al checkout.
export default function LoginLink({ email }: { email: string }) {
  const params = new URLSearchParams({ email: email.trim(), next: "/checkout" });
  return (
    <Link href={`/cuenta/iniciar-sesion?${params}`} className="underline">
      Iniciar sesión
    </Link>
  );
}
