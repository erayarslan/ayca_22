$(document).ready(function () {
  $("#chat_area").hide();

  $('#nick').keypress(function (event) {
    if (event.keyCode == 13) {
      $('#login').click();
    }
  });

  $("#nick").focus();

  var init = function (socket) {
    $("#message").focus();

    socket.on("updateUsers", function (data) {
      $("#users").empty();
      for (var key in data) {
        $("#users").append('<li><input type="checkbox" checked value="' + key + '">' + data[key].nick + "(" + (data[key].online ? 'online' : 'offline') + ")" + '</li>');
      }
    });

    socket.on("checkUndeliveredMessages", function (data) {
      for (var i = 0; i < data.length; i++) {
        $("#messages").append('<li><span id="nick_display">' + data[i].from + "</span> " + data[i].message + '</li>');
      }
    });

    socket.on("newMessage", function (obj) {
      $("#messages").append('<li><span id="nick_display">' + obj.nick + "</span> " + obj.message + '</li>');
    });

    $('#message').keypress(function (event) {
      if (event.keyCode == 13) {
        $('#send').click();
      }
    });

    $("#send").click(function () {
      var selectedUsers = $("#users input:checkbox:checked").map(function () {
        return $(this).val();
      }).get();

      socket.emit("sendMessage", {
        from_id: socket.id,
        target_ids: selectedUsers,
        message: $("#message").val()
      });

      $("#message").val("");
    });
  };

  $("#login").click(function () {
    var socket = io.connect('http://localhost:8084');
    socket.on('disconnect', function () {
      alert("Server Died :'(");
      window.location.reload(); // if possible :D
    });
    socket.emit("newUser", $("#nick").val());
    $("#login_area").hide();
    $("#chat_area").show();

    init(socket);
  });
});