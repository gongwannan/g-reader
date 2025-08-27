const vscode = acquireVsCodeApi();

// Notify extension that WebView is ready
window.addEventListener("DOMContentLoaded", () => {
  vscode.postMessage({
    type: "ready"
  });
});

window.addEventListener("message", (event) => {
  const message = event.data;
  
  switch (message.type) {
    case "update":
      try {
        const messageObj = JSON.parse(message.value);
        const bookListElement = document.querySelector("#bookList");
        
        // Clear existing list
        bookListElement.innerHTML = '';
        
        if (!messageObj.files || messageObj.files.length === 0) {
          const emptyElement = document.createElement("li");
          emptyElement.innerText = "没有找到TXT文件";
          emptyElement.classList.add("empty");
          bookListElement.appendChild(emptyElement);
          return;
        }
        
        // Create book elements
        messageObj.files.forEach((file) => {
          const bookEle = document.createElement("li");
          bookEle.innerText = file;
          bookEle.classList.add("book-item");
          
          if (messageObj.currentFile === file) {
            bookEle.classList.add("selected");
          }
          
          bookEle.addEventListener("click", (e) => {
            const target = e.target;
            
            // Update UI selection
            document.querySelectorAll(".book-item.selected")
              .forEach((el) => el.classList.remove("selected"));
            target.classList.add("selected");
            
            // Notify extension
            vscode.postMessage({
              type: "choose",
              value: target.innerText
            });
          });
          
          bookListElement.appendChild(bookEle);
        });
      } catch (error) {
        console.error("Error updating book list:", error);
        const errorElement = document.createElement("li");
        errorElement.innerText = "加载书籍列表时出错";
        errorElement.classList.add("error");
        document.querySelector("#bookList").appendChild(errorElement);
      }
      break;
  }
});