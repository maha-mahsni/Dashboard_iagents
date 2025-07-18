import { IconChartBar, IconLayoutDashboard } from "@tabler/icons-react"
import { uniqueId } from "lodash"
import ChatIcon from '@mui/icons-material/Chat'

const Menuitems = [
 {
    id: uniqueId(),
    title: "Dashboard",
    icon: IconChartBar,
    href: "/charts", 
  },
  {
    id: uniqueId(),
    title: "Gestion Agents IA",
    icon: IconLayoutDashboard,
    href: "/",
  },
  {
  id: uniqueId(),
  title: "Recommandation IA",
  icon: ChatIcon,
  href: "/chatbot",
},
]

export default Menuitems
