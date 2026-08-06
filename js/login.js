function realizarLogin(event) {
  event.preventDefault(); // Impede o envio padrão do formulário

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorElem = document.getElementById("login-error");

  // Simulação de credenciais (depois podemos ligar ao Notion se quiseres)
  // Podes alterar o e-mail e palavra-passe aqui para os teus dados:
  if (email === "ronilson@empresa.com" && password === "RoniLima123456") {
    // Guarda no navegador que o utilizador está autenticado
    localStorage.setItem("rh_logado", "true");
    localStorage.setItem("rh_usuario", "Ronilson");

    // Redireciona para a página principal do dashboard
    window.location.href = "index.html";
  } else {
    // Mostra a mensagem de erro
    errorElem.style.display = "block";
  }
}