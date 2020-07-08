import React from 'react'
import PropTypes from 'prop-types'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import CssBaseline from '@material-ui/core/CssBaseline'
import useScrollTrigger from '@material-ui/core/useScrollTrigger'
import { Slide, Tabs, Tab } from '@material-ui/core'
import { useRouter } from 'next/router'
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
  return <Tab onClick={() => push(props.to)} label={props.children} id={routes[props.to]} />
 
}
const TheTabs = styled(Tabs)`
  .MuiTabs-indicator {
    background-color: white !important;
  }
`
const Img = styled.img`
  object-fit: scale-down;
  box-sizing: border-box;
  padding: 10px;
  width: 100px;
  margin-left: auto;
  filter: brightness(0) invert(1);
`
export default function NavBar(props) {
  const { pathname } = useRouter()
  return (
    <React.Fragment>
      <CssBaseline />
      <HideOnScroll {...props}>
        <AppBar>
          <TheTabs value={routes[pathname]}>
            <NavLink to='/'>Puts</NavLink>
            <NavLink to='/calls'>Calls</NavLink>
            {/* <NavLink to='/top-companies'>Top Companies</NavLink> */}
            <Img src='/static/option-pricing-machine.png' />
          </TheTabs>
        </AppBar>
      </HideOnScroll>
      <Toolbar />
    </React.Fragment>
  )
}