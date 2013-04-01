////// model /////
Board = new Meteor.Collection("board");
Comment = new Meteor.Collection("comment");
Note = new Meteor.Collection("note");

///// template /////
Template.boardListSection.boardList = function(){
  return Board.find();
}
Template.boardSection.board = function(){
  var boardId = Session.get("boardId");
  return Board.find({_id: boardId});
}
Template.boardSection.commentList = function(){
  var id = Session.get("boardId");
  //ソート順調性
  var sortComment = window.localStorage.getItem("sortComment");
  if(!sortComment) {
    sortComment = 1; 
    window.localStorage.setItem("sortComment", sortComment);
  }
  return Comment.find({boardId:id}, {sort: {createDate: sortComment}});
}

///// bind /////
///// event map set /////
Template.header.events({
  "click .header-logout": function(event){
    logout();
  },
  "click .home-link": function(event){
    Session.set("boardId", null);
    Backbone.history.navigate("/", {trigger: true});
  }
});
Template.userLogin.events({
  "click .login-btn": function(event){
    var username = $(".input-username").val();
    window.localStorage.setItem("username", username);
    whiteboardInit();

    return false;
  },
  "keydown .login-user-form": function(event){
    if(event.keyCode == 13){
      var username = $(".input-username").val();
      window.localStorage.setItem("username", username);
      whiteboardInit();

      return false;
    }
  }
});
Template.boardListSection.events({
  "click .open-create-board-dialog": function(event){
    var $boardTitle = $(".create-board-title");

    $boardTitle.val("");
    $(".create-board-description").val("");
    $('#createBoardModal').modal("show");
    $boardTitle.focus();
  },
  "click .create-board": function(event){
    var title = $(".create-board-title").val();
    if(!title) return;
    var description = $(".create-board-description").val();
    var username = $(".username", ".header-username").text();

    //DB　insert
    var date = new Date();
    var boardId = Board.insert({
      title:title, 
      description:description,
      username:username,
      commentTotalCount:0,
      commentCount:0,
      displayCreateDate:getDate(date),
      createDate:date.getTime()
    }, function(){
      Session.set("boardId", boardId);
      $('#createBoardModal').modal("hide");
      Backbone.history.navigate("/" + boardId, {trigger: true});
    });
  },
  "keyup .search-board": function(event){
    var $boardList = $(".board-list");
    
    var word = $(event.currentTarget).val();

    if(!word){
      $boardList.children().show();
      return;
    }

    var hideTarget = $boardList.children("li").find(".board-title").not(":contains(" + word + ")");
    hideTarget.parents("li.board").hide();
  }
});
Template.board.events({
  "click .board": function(event){
    var boardId = $(".board-id", event.currentTarget).text();
    Session.set("boardId", boardId);
    Backbone.history.navigate("/" + boardId, {trigger: true});
  },
  "click .delete-board": function(event){
    if(!confirm("delete ?")){
      return false;
    }
    var board = $(event.currentTarget).parents(".board");
    var id = board.find(".board-id").text();
    Board.remove({_id:id});
    Comment.remove({boardId:id});
    return false;
  },
  "mouseover .board": function(event){
    var username = $(".username", ".header-username").text();
    var commentUsername = $(event.currentTarget).find(".username").text();
    if(username!=commentUsername) return;
    $(".delete-board", $(event.currentTarget)).show();
  },
  "mouseout .board": function(event){
    var username = $(".username", ".header-username").text();
    var commentUsername = $(event.currentTarget).find(".username").text();
    if(username!=commentUsername) return;
    $(".delete-board", $(event.currentTarget)).hide();
  }
});
Template.boardSection.events({
  "click .sort-comment": function(event){
    //ソート順を変更
    var sortComment = window.localStorage.getItem("sortComment");
    if(sortComment == 1){
      //change to desc
      window.localStorage.setItem("sortComment", -1);
    }else if(sortComment == -1){
      //change to asc
      window.localStorage.setItem("sortComment", 1);
    }

    //Board画面変更
    renderBoard();
  }
});

if(!($(".create-comment").hasClass("create-comment-bind"))){
  $(".create-comment").addClass("create-comment-bind");
  
  $(document).on("click", ".create-comment", function(event){
      var $btn = $(this);
      $btn.removeClass("create-comment");

      var boardId = $(".board-id").text();
      var $comment = $(".comment-textarea"); 
      var content = $comment.val();


      if(!content) {
        $comment.focus();
        $btn.addClass("create-comment");
        return;
      }

      var username = $(".username", ".header-username").text();
      var board = Board.findOne({_id:boardId});
      var date = new Date();
      var displayCreateDate = getDateTime(date);
      var createDate = date.getTime();

      Board.update({_id:boardId}, {$inc:{commentTotalCount:1}});
      Board.update({_id:boardId}, {$inc:{commentCount:1}});

      Comment.insert({
        boardId:boardId,
        username:username,
        content:content,
        displayCreateDate:displayCreateDate,
        createDate:createDate,
        number:Board.findOne({_id:boardId}).commentTotalCount
      });

      $comment.val("");
      $comment.focus();
      $btn.addClass("create-comment");
  });
}
Template.commentForm.rendered = function(){

  $(".comment-textarea").resizeTextarea();

  //size adjustment
  var $commentForm = $(".comment-form");
  $commentForm.width($(window).width());
  $(window).resize(function(){
    //comment form
    $commentForm.width($(window).width());
  });
}
Template.comment.events({
  "mouseover .comment-item": function(event){
    var username = $(".username", ".header-username").text();
    var commentUsername = $(event.currentTarget).find(".username").text();
    if(username!=commentUsername) return;
    $(".delete-comment", $(event.currentTarget)).show();
  },
  "mouseout .comment-item": function(event){
    var username = $(".username", ".header-username").text();
    var commentUsername = $(event.currentTarget).find(".username").text();
    if(username!=commentUsername) return;
    $(".delete-comment", $(event.currentTarget)).hide();
  },
  "click .delete-comment": function(event){
    var boardId = $(".board-id").text();
    var id = $(event.currentTarget).parents(".comment-item").children(".comment-id").text();
    Comment.remove({_id:id});
    Board.update({_id:boardId}, {$inc:{commentCount:-1}});
  }
});
Template.comment.rendered = function(){
  var node = this.firstNode;
  if(node){
    var $cmt = $(node);
    $cmt.hide();
    $cmt.fadeIn();
  }
};

///// implement /////
////// URL control /////
var WBRouter = Backbone.Router.extend({
  routes: {
    "": "root",// root
    ":boardId": "board",// #board/boardId
    "help/": "help"    // #help
  },
  root: function(){
    Session.set("boardId", null);
    whiteboardInit();
  },
  board: function(boardId){
    Session.set("boardId", boardId);
    whiteboardInit();
  },
  help: function() {
    alert("help");
  }
});
Meteor.startup(function(){
  new WBRouter();
  Backbone.history.start({pushState: true});
});

////////// initialize //////////
function whiteboardInit(){
  if(login()){
    var boardId = Session.get("boardId");
    if(boardId){
      renderBoard();
    }else{
      renderBoardList();
    }
  }else{
    renderLoginForm();
  }
}

///// rendering /////
function renderLoginForm(){
  Meteor.defer(function(){
    $(".content").html(Meteor.render(Template.userLogin));
  });
}
function renderBoardList(){
  Meteor.defer(function(){
    $(".content").html(Meteor.render(Template.boardListSection));
  });
}
function renderBoard(){
  Meteor.defer(function(){
    $(".content").html(Meteor.render(Template.boardSection));
  });
}

///// login logout /////
function login(){
  var username = window.localStorage.getItem("username");
  if(!username) return false;
  window.localStorage.setItem("username", username);
  $(".username", ".header-username").text(username);
  $(".header-info").show();
  return true;
}
function logout(){
  window.localStorage.removeItem("username");
  Session.set("boardId", null);
  $(".header-info").hide();
  $(".username", ".header-username").text("");
  $(".content").html(Meteor.render(Template.userLogin));
}

///// util /////
function getDateTime(date){
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();
  var hour = date.getHours();
  var minute = date.getMinutes();
  minute = (minute<10) ? ("0" + minute):minute;
  var second = date.getSeconds();
  second = (second<10) ? ("0" + second):second;
  return year + "/" + month + "/" + day + " " + hour + ":" + minute + ":" + second;
}
function getDate(date){
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();
  return year + "/" + month + "/" + day;
}
///// resize textarea /////
(function($){
  $.fn.resizeTextarea=function(){var b=$(this),d=b.attr("rows")||1,c=d;b.attr("rows",c);b.keydown(function(){switch(event.keyCode){case 13:var a=b.val().match(/\n/g),a=(a?a.length:0)+1;a>=d&&(c=a,b.attr("rows",++c))}});b.keyup(function(){var a=b.val().match(/\n/g),a=(a?a.length:0)+1;a>=d?(c=a,b.attr("rows",c)):b.attr("rows",d)})};
})(jQuery);