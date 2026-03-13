"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Icons } from "@/components/icons"

export function Component() {
  const [agreed, setAgreed] = useState<boolean | "indeterminate">(false)

  return (
    <section id="cta">
      <div className="container mx-auto w-full p-4 md:p-10">
        <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8 xl:grid-cols-2 xl:gap-10">
          <div className="flex flex-col items-start justify-center space-y-4">
            <Icons.logo className="size-10" />
            <div className="space-y-2">
              <h1 className="text-2xl font-medium tracking-tight text-balance sm:text-4xl">
                Get started with MagicUI
              </h1>
              <p className="text-muted-foreground text-base text-balance md:text-lg">
                Build a fast and animated marketing website with that converts
                visitors into customers.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-4 min-[400px]:flex-row lg:flex-col">
            <div className="w-full space-y-4">
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full name</Label>
                  <Input
                    id="full-name"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    placeholder="Enter your email"
                    required
                    type="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" required type="password" />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreed}
                    onCheckedChange={setAgreed}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to the{" "}
                    <Link href="#" className="text-primary underline">
                      Terms and Conditions
                    </Link>
                  </label>
                </div>
                <Button className="w-full" type="submit" disabled={!agreed}>
                  Sign up
                </Button>
              </form>
              <p className="text-muted-foreground text-center text-xs">
                By signing below, you agree to the Terms and Conditions.
              </p>
              <div className="flex justify-center">
                <Link
                  className="text-primary text-sm underline underline-offset-4"
                  href="#"
                >
                  Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
