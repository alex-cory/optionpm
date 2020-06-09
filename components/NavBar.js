import React from 'react'
import PropTypes from 'prop-types'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import CssBaseline from '@material-ui/core/CssBaseline'
import useScrollTrigger from '@material-ui/core/useScrollTrigger'
import Box from '@material-ui/core/Box'
import Container from '@material-ui/core/Container'
import { Slide, Tabs, Tab } from '@material-ui/core'
import Link from 'next/link'
import { useRouter, push } from 'next/router'
import styled from 'styled-components'

function HideOnScroll(props) {
  const { children, window } = props
  // Note that you normally won't need to set the window ref as useScrollTrigger
  // will default to window.
  // This is only being set here because the demo is in an iframe.
  const trigger = useScrollTrigger({ target: window ? window() : undefined })

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  )
}

HideOnScroll.propTypes = {
  children: PropTypes.element.isRequired,
  /**
   * Injected by the documentation to work in an iframe.
   * You won't need it on your project.
   */
  window: PropTypes.func,
}

const routes = { '/': 0, '/calls': 1, '/top-companies': 2 }
const NavLink = props => {
  const { push } = useRouter()
  return (
    // <Link href={props.to}>
      <Tab onClick={() => push(props.to)} label={props.children} id={routes[props.to]} />
    // </Link>
  )
}
const TheTabs = styled(Tabs)`
  .MuiTabs-indicator {
    background-color: white !important;
  }
`
const Img = styled.div`
  display: block;
  max-width:230px;
  max-height:95px;
  width: auto;
  height: auto;
`
export default function NavBar(props) {
  const { pathname } = useRouter()
  return (
    <React.Fragment>
      <CssBaseline />
      <HideOnScroll {...props}>
        <AppBar>
          {/* <Toolbar> */}
            <TheTabs value={routes[pathname]}>
              <NavLink to='/'>Puts</NavLink>
              <NavLink to='/calls'>Calls</NavLink>
              {/* <NavLink to='/top-companies'>Top Companies</NavLink> */}
              <img style={{ marginLeft: 'auto' }} width={120} src='/static/option-pricing-machine.png' />
            </TheTabs>
          {/* </Toolbar> */}
        </AppBar>
      </HideOnScroll>
      <Toolbar />
      {/* <Container>
        <Box my={2}>
          {[...new Array(12)]
            .map(
              () => `Cras mattis consectetur purus sit amet fermentum.
Cras justo odio, dapibus ac facilisis in, egestas eget quam.
Morbi leo risus, porta ac consectetur ac, vestibulum at eros.
Praesent commodo cursus magna, vel scelerisque nisl consectetur et.`,
            )
            .join('\n')}
        </Box>
      </Container> */}
    </React.Fragment>
  )
}