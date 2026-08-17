"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
export function AuthActionLink({ href, returnUrl, className, children }: { href: string; returnUrl: string; className?: string; children: React.ReactNode }) { const { isAuthenticated } = useAuth(); return <Link href={isAuthenticated ? href : `/login?returnTo=${encodeURIComponent(returnUrl)}`} className={className}>{children}</Link>; }
