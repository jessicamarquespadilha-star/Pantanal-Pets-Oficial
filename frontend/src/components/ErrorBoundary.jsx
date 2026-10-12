import { Component } from 'react'
import PaginaErro from './PaginaErro.jsx'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { erro: null }
  }

  static getDerivedStateFromError(erro) {
    return { erro }
  }

  componentDidCatch(erro, info) {
    console.error('Erro inesperado na aplicação:', erro, info)
  }

  tentarNovamente = () => {
    this.setState({ erro: null })
  }

  render() {
    if (this.state.erro) {
      return (
        <PaginaErro
          mensagem="A aplicação encontrou um erro inesperado. Seus dados não foram perdidos."
          onTentarNovamente={this.tentarNovamente}
        />
      )
    }
    return this.props.children
  }
}
