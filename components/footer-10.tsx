import { ChevronRightIcon } from "@radix-ui/react-icons"

type FooterLink = { id: number; title: string; url: string }

const footerLinks: FooterLink[][] = [
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
  [
    { id: 9, title: "Press", url: "#" },
    { id: 10, title: "Careers", url: "#" },
    { id: 11, title: "Newsletters", url: "#" },
    { id: 12, title: "More", url: "#" },
  ],
]
export function Footer() {
  return (
    <div className="px-7 md:px-10">
      <div className="flex flex-col items-center justify-center gap-y-3 border-b border-dashed border-slate-400/20 py-10 lg:flex-row lg:items-center lg:justify-between">
        <h3 className="max-w-sm text-center text-2xl font-bold text-balance text-neutral-900 md:text-start md:text-4xl dark:text-white">
          Still have questions?
        </h3>
        <div className="flex flex-col items-center justify-center gap-x-5 gap-y-2 py-4 sm:flex-row">
          <a
            href="#"
            className="flex h-10 w-40 items-center justify-center rounded-full bg-neutral-800 text-base font-semibold text-white transition ease-out hover:ring-2 hover:ring-neutral-900 hover:ring-offset-2 lg:h-12 lg:text-base dark:bg-white dark:text-black dark:hover:ring-white dark:hover:ring-offset-black"
          >
            <span className="tracking-tight">Let's Chat</span>
            <ChevronRightIcon className="ml-2" />
          </a>
          <a
            href="#"
            className="flex h-10 w-40 items-center justify-center rounded-full border text-sm font-semibold text-neutral-900 transition ease-out hover:bg-neutral-200/30 lg:h-12 lg:text-base dark:text-white dark:hover:bg-neutral-700/30"
          >
            <span className="tracking-tight">Request Demo</span>
          </a>
        </div>
      </div>
      <div className="flex flex-col py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-start justify-start gap-y-5">
          <a href="#" className="flex items-center gap-x-2.5">
            <img
              className="h-8 w-8 rounded-md"
              src="https://magicui.design/icon.png"
              alt=""
            />
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
              Magic UI
            </h1>
          </a>
          <p className="tracking-tight text-neutral-900 dark:text-white">
            UI library for Design Engineers
          </p>
          <p className="text-sm tracking-tight text-neutral-500 sm:text-center dark:text-neutral-400">
            All rights reserved.
          </p>
        </div>
        <div className="pt-5 md:w-1/2">
          <div className="flex items-center justify-between gap-x-3 px-0 lg:px-10">
            {footerLinks.map((column, columnIndex) => (
              <ul key={columnIndex} className="flex flex-col gap-y-2">
                {column.map((link) => (
                  <li
                    key={link.id}
                    className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug font-medium text-neutral-400 duration-200 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  >
                    <a href={link.url}>{link.title}</a>
                    <ChevronRightIcon className="h-4 w-4 translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
