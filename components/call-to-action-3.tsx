"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

export function Newsletter() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Handle form submission
    console.log(values)
  }

  return (
    <section id="newsletter">
      <div className="container mx-auto p-4 md:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
          <div className="flex flex-col items-start gap-6 lg:w-1/2">
            <div className="space-y-2">
              <h2 className="text-2xl font-medium tracking-tight text-balance sm:text-4xl">
                Stay Updated
              </h2>
              <p className="text-muted-foreground text-base text-balance md:text-lg">
                Get the latest features, tips, and exclusive offers for our SaaS
                platform.
              </p>
            </div>
            <div className="w-full max-w-md">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex flex-col items-start gap-4"
                >
                  <div className="flex w-full flex-col gap-3">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="sr-only">Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-0">
                          <FormLabel className="sr-only">Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Work Email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full sm:w-auto">
                      Get Started
                    </Button>
                  </div>
                </form>
              </Form>
              <p className="text-muted-foreground mt-4 text-left text-sm">
                By subscribing, you agree to receive product updates and
                marketing communications. You can opt-out anytime.
              </p>
            </div>
          </div>
          <div className="mx-auto w-full lg:w-1/2">
            <img
              alt="SaaS platform preview"
              className="h-[300px] w-full rounded-2xl border object-cover"
              src="https://ui.shadcn.com/placeholder.svg"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
