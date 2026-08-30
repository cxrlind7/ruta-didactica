"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    // Se anima al montar, no al entrar en el viewport: este contenido no es
    // decorativo, así que no puede depender de un IntersectionObserver que
    // con un scroll rápido lo deje a medio aparecer. Al momento en que el
    // usuario llega hasta aquí, la animación ya terminó.
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
