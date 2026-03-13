"use client"

import { useState } from "react"

const footerLinks: { id: number; title: string; url: string }[][] = [
  [
    { id: 1, title: "About", url: "#" },
    { id: 2, title: "Contact", url: "#" },
    { id: 3, title: "Blog", url: "#" },
    { id: 4, title: "Story", url: "#" },
  ],
  [
    { id: 5, title: "Company", url: "#" },
    { id: 6, title: "Product", url: "#" },
    { id: 7, title: "Press", url: "#" },
    { id: 8, title: "More", url: "#" },
  ],
]

export function Footer() {
  const [email, setEmail] = useState("")
  const [isSubscribed, setIsSubscribed] = useState(false)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    console.log("Email submitted:", email)
    setEmail("")
    setIsSubscribed(true)
    // Reset the subscribed status after 2 seconds
    setTimeout(() => {
      setIsSubscribed(false)
    }, 2000)
  }

  return (
    <footer className="px-7 py-10 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-x-5 gap-y-10 md:items-start md:justify-between lg:flex-row lg:px-10 xl:px-0">
        <div className="flex w-full flex-col items-start justify-start gap-y-5 md:w-1/2 lg:w-1/3">
          <a href="/" className="flex items-center gap-x-2">
            <img
              className="h-8 w-8 rounded-md"
              src="https://magicui.design/icon.png"
              alt=""
            />
            <h2 className="font-bold text-neutral-900 dark:text-white">
              Magic UI
            </h2>
          </a>
          <p className="tracking-tight text-neutral-900 dark:text-white">
            UI library for Design Engineers
          </p>
        </div>

        <div className="mt-2.5 flex items-center justify-start gap-x-10">
          {footerLinks.map((column, columnIndex) => (
            <ul key={columnIndex} className="flex flex-col gap-y-2">
              {column.map((link) => (
                <li
                  key={link.id}
                  className="text-[15px]/normal font-medium text-neutral-400 transition-all duration-100 ease-linear hover:text-neutral-900 hover:underline hover:underline-offset-4 dark:font-medium dark:text-neutral-400 hover:dark:text-neutral-100"
                >
                  <a href={link.url}>{link.title}</a>
                </li>
              ))}
            </ul>
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex flex-col gap-y-1">
            <p className="text-lg font-bold">Contact us</p>
            <p className="font-normal text-neutral-500 dark:font-medium">
              We have a great support team to help you
            </p>
            <div className="flex items-center gap-x-2 pt-2">
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-x-2"
              >
                <input
                  className="w-full rounded-lg border bg-neutral-50 p-2 placeholder:text-sm placeholder:text-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-0 focus-visible:outline-none dark:bg-neutral-900 dark:placeholder:text-neutral-600 dark:focus-visible:ring-neutral-700"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  required
                />
                <button
                  type="submit"
                  className="font-base w-48 rounded-lg bg-neutral-900 px-5 py-2 text-white transition-all ease-out hover:ring-1 hover:ring-neutral-800 hover:ring-offset-2 hover:ring-offset-current active:scale-95 dark:bg-white dark:text-neutral-900 dark:hover:ring-neutral-50"
                >
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
