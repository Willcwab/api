import express from "express"
import cors from "cors"
import chrono from "chrono-node"

const app = express()
app.use(cors())
app.use(express.json())

const extenso = ["zero","uma","duas","três","quatro","cinco","seis","sete","oito","nove","dez"]

function extrairNumeros(texto){
  return texto.match(/\d+(?:[\.,]\d+)?/g)?.map(n => parseFloat(n.replace(",", "."))) || []
}

function detectarMeio(texto){
  if (texto.includes("pix")) return "PIX"
  if (texto.includes("boleto")) return "boleto bancário"
  if (texto.includes("cartao") || texto.includes("crédito")) return "cartão de crédito"
  if (texto.includes("debito")) return "cartão de débito"
  return null
}

app.post("/normalizar-pagamento", (req,res) => {
  const original = req.body.texto || ""
  const texto = original.toLowerCase()

  const numeros = extrairNumeros(texto)
  const meio = detectarMeio(texto)

  // Datas
  const datas = chrono.pt.parse(texto).map(d => {
    const dt = d.start.date()
    return dt.toLocaleDateString("pt-BR")
  })

  // Parcelas
  const parcelasMatch = texto.match(/(\d+)\s*(x|vez|vezes|parcelas)/)
  const parcelas = parcelasMatch ? parseInt(parcelasMatch[1]) : null

  // Entrada
  let entrada = null
  if (texto.includes("a vista") || texto.includes("à vista") || texto.includes("entrada") || texto.includes("sinal")) {
    entrada = numeros[0] || null
  }

  // Valor da parcela
  let valorParcela = null
  if (parcelas && numeros.length > 1) {
    valorParcela = numeros[numeros.length - 1]
  }

  // Valor total
  let total = null
  if (entrada && parcelas && valorParcela) {
    total = entrada + (parcelas * valorParcela)
  } else if (!entrada && parcelas && valorParcela) {
    total = parcelas * valorParcela
  }

  // Montagem
  let resultado = ""

  // Caso só meio de pagamento
  if (!numeros.length && meio) {
    resultado = `O pagamento será efetuado por meio de ${meio}.`
    return res.json({ resultado })
  }

  if (!total) {
    resultado = "Não foi possível identificar valores suficientes para gerar a cláusula de pagamento."
    return res.json({ resultado })
  }

  resultado = `O valor total de R$ ${total.toFixed(2)} será pago `

  if (entrada) {
    resultado += `da seguinte forma: R$ ${entrada.toFixed(2)} a título de entrada, `
    resultado += `e o saldo remanescente em ${parcelas} (${extenso[parcelas]}) parcelas de R$ ${valorParcela.toFixed(2)}`
  } else {
    resultado += `em ${parcelas} (${extenso[parcelas]}) parcelas de R$ ${valorParcela.toFixed(2)}`
  }

  if (meio) {
    resultado += `, por meio de ${meio}`
  }

  if (datas.length) {
    resultado += `, sendo a primeira com vencimento em ${datas[0]}`
    if (datas[1]) resultado += ` e a segunda em ${datas[1]}`
    if (datas[2]) resultado += ` e a terceira em ${datas[2]}`
  }

  resultado += "."

  res.json({ resultado })
})

app.listen(3000, () => {
  console.log("API rodando na porta 3000")
})
