import {
  InstagramLogoIcon,
  LinkedInLogoIcon,
  TwitterLogoIcon,
} from "@radix-ui/react-icons"

type Link = {
  text: string
  url: string
}

const links: Link[] = [
  { text: "About", url: "#" },
  { text: "Services", url: "#" },
]

interface Icon {
  icon: React.ReactNode
  url: string
}

const icons: Icon[] = [
  { icon: <InstagramLogoIcon />, url: "https://www.instagram.com" },
  { icon: <LinkedInLogoIcon />, url: "https://www.linkedin.com" },
  { icon: <TwitterLogoIcon />, url: "https://www.twitter.com" },
]

export function Footer() {
  return (
    <footer className="mx-auto max-w-7xl p-5 px-5 lg:px-10">
      <div className="flex w-full flex-col items-start justify-between gap-x-5 gap-y-5 md:flex-row md:items-center">
        <div className="flex items-center gap-x-2">
          <img
            className="h-8 w-8 rounded-full"
            src="https://magicui.design/icon.png"
            alt="magicui-logo"
          />
          <h2 className="font-bold text-neutral-900 dark:text-white">
            Magic UI
          </h2>
        </div>

        <ul className="flex items-center justify-center gap-x-5">
          {links.map((link, index) => (
            <li
              key={index}
              className="text-[15px]/normal font-medium text-neutral-400 transition-all duration-100 ease-linear hover:text-neutral-900 hover:underline hover:underline-offset-4 dark:font-medium dark:text-neutral-400 hover:dark:text-neutral-100"
            >
              <a href={link.url}>{link.text}</a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-x-4">
          {icons.map((icon, index) => (
            <a
              key={index}
              href={icon.url}
              className="text-xl text-neutral-500 hover:text-neutral-900 hover:dark:text-white"
            >
              {icon.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
