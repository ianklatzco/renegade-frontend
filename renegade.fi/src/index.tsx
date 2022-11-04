import React from 'react'
import ReactDOM from 'react-dom/client'
import mixpanel from 'mixpanel-browser'

import logo from './icons/logo.png'
import logoDark from './icons/logo_dark.png'

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'

import {
  ChakraProvider,
  ColorModeScript,
  extendTheme,
  useColorMode,
  Box,
  Center,
  Image,
  type ThemeConfig
} from '@chakra-ui/react'

mixpanel.init('91787e297d629eae158b8fcf156c845f')
mixpanel.track('Initialization')

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true
}
const styles = {
  global: {
    body: {
      fontFamily: 'Montserrat',
      fontWeight: '400',
      bg: 'white',
      textAlign: 'center'
    }
  }
}
const theme = extendTheme({ config, styles })

interface ExternalNavigateProps {
  to: string
}
class ExternalNavigate extends React.Component<ExternalNavigateProps> {
  componentDidMount () {
    window.open(this.props.to, '_self')
  }

  render () {
    return null
  }
}

function App () {
  const { colorMode } = useColorMode()
  return (
    <Box w="100vw" maxW="100%" h="100vh" bg={colorMode === 'light' ? 'white' : 'black'}>
      <Center>
        <Image
          src={colorMode === 'light' ? logo : logoDark}
          mt={['10vh', '37vh']}
          w={['70%', '40%']}
        />
      </Center>
    </Box>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/whitepaper" element={<ExternalNavigate to="/whitepaper.pdf" />} />
          <Route path="/*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
)
