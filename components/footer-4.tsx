import {
  InstagramLogoIcon,
  LinkedInLogoIcon,
  TwitterLogoIcon,
} from "@radix-ui/react-icons"

interface Icon {
  icon: React.ReactNode
  url: string
}

const icons: Icon[] = [
  { icon: <LinkedInLogoIcon />, url: "#" },
  { icon: <InstagramLogoIcon />, url: "#" },
  { icon: <TwitterLogoIcon />, url: "#" },
]

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
  [
    { id: 9, title: "Press", url: "#" },
    { id: 10, title: "Careers", url: "#" },
    { id: 11, title: "Newsletters", url: "#" },
    { id: 12, title: "More", url: "#" },
  ],
  [
    { id: 13, title: "Press", url: "#" },
    { id: 14, title: "Careers", url: "#" },
    { id: 15, title: "Newsletters", url: "#" },
    { id: 16, title: "More", url: "#" },
  ],
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="flex w-full flex-col px-7 py-10 md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex w-full items-center justify-between gap-x-3 lg:pl-10">
          {footerLinks.map((column, columnIndex) => (
            <ul key={columnIndex} className="flex flex-col gap-y-2">
              {column.map((link) => (
                <a href={link.url} key={link.id}>
                  <li className="text-[15px]/normal font-medium text-neutral-400 transition-all duration-100 ease-linear hover:text-neutral-900 hover:underline hover:underline-offset-4 dark:font-medium dark:text-neutral-400 hover:dark:text-neutral-100">
                    {link.title}
                  </li>
                </a>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <div className="flex flex-col justify-between gap-y-5 border-t border-neutral-500/20 bg-neutral-100 px-7 py-10 md:flex-row md:items-center md:px-10 dark:border-neutral-700/50 dark:bg-neutral-900">
        <div className="flex flex-col items-start justify-start gap-y-3.5">
          <a href="#" className="flex items-center gap-x-2.5">
            <img
              className="h-10 w-10 rounded-full"
              src="https://magicui.design/icon.png"
              alt=""
            />
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
              Magic UI
            </h1>
          </a>
          <p className="text-neutral-900 dark:text-white">
            UI library for Design Engineers
          </p>
        </div>

        <div className="flex flex-col gap-y-5">
          <div className="flex items-center gap-x-4">
            {icons.map((icon, index) => (
              <a
                key={index}
                href={icon.url}
                className="flex h-6 w-6 items-center justify-center text-neutral-400 transition-all duration-100 ease-linear hover:text-neutral-900 hover:underline hover:underline-offset-4 dark:font-medium dark:text-neutral-500 hover:dark:text-neutral-100"
              >
                {icon.icon}
              </a>
            ))}
          </div>
          <p className="text-sm text-neutral-900 dark:text-white">
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
