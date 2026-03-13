import { ChevronRightIcon } from "@radix-ui/react-icons"

type Link = {
  text: string
  url: string
}

const links: Link[] = [
  { text: "About", url: "#" },
  { text: "Services", url: "#" },
  { text: "Contact", url: "#" },
  { text: "Careers", url: "#" },
]

export function Footer() {
  return (
    <footer className="px-5 py-5 lg:px-10">
      <div className="flex w-full flex-col items-center justify-between gap-x-5 gap-y-5 md:flex-row">
        <a href="#" className="flex items-center gap-x-2">
          <img
            className="h-8 w-8 rounded-full"
            src="https://magicui.design/icon.png"
            alt=""
          />
          <h2 className="font-bold text-neutral-900 dark:text-white">
            Magic UI
          </h2>
        </a>
        <ul className="flex items-center justify-center gap-x-10">
          {links.map((link, index) => (
            <li
              key={index}
              className="text-[15px]/normal font-medium text-neutral-400 transition-all duration-100 ease-linear hover:text-neutral-900 hover:underline hover:underline-offset-4 dark:font-medium dark:text-neutral-400 hover:dark:text-neutral-100"
            >
              <a href={link.url}>{link.text}</a>
            </li>
          ))}
        </ul>
        <a
          href="/pricing"
          className="inline-flex w-fit items-center justify-center gap-x-1 rounded-md bg-neutral-800 px-6 py-2 text-sm font-semibold tracking-tighter text-white ring-1 transition duration-200 hover:ring-2 hover:ring-neutral-900 hover:ring-offset-2 lg:h-12 lg:text-base dark:bg-white dark:text-black dark:hover:ring-white dark:hover:ring-offset-black"
        >
          Start free trial
          <ChevronRightIcon className="ml-1 size-4 transition-all duration-300 ease-out group-hover:translate-x-1" />
        </a>
      </div>
    </footer>
  )
}
