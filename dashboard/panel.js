'use strict';

var $panel = $bundle.find('.beam-panel');
console.log($panel);
var $reconnect = $panel.find('.ctrl-reconnect');
var $logs = $panel.find('.log');
var $clearLogs = $panel.find('.ctrl-clearLogs');

var $test = $panel.find('.ctrl-test');

var MAX_LOG_LEN = 30;

nodecg.listenFor('subscription', addSub);
nodecg.listenFor('follow', addFollow);

nodecg.listenFor('log', function(msg) {
    $logs.append('<div class="log-message">' + msg + '</div>');

    var $children = $logs.children();
    var len = $children.length;
    if (len > MAX_LOG_LEN) {
        var $toDelete = $children.slice(0, len - MAX_LOG_LEN);
        $toDelete.remove();
    }

    $logs.animate({ scrollTop: $logs[0].scrollHeight}, 1000);
});

var button =
    '<button type="button" data-dismiss="alert" class="close" title="Dismiss this event">' +
        '<span aria-hidden="true">×</span>' +
        '<span class="sr-only">Close</span>' +
    '</button>' +
    '<button data-command="resend" type="button" class="close fa-alert-button alert-control" title="Resend this event">' +
        '<span class="fa fa-refresh"aria-hidden="true"></span>' +
        '<span class="sr-only">Close</span>' +
    '</button>';

function addSub(note) {
    if(note.replay !== undefined && note.replay) {
        return;
    }
    var alert =
        '<div role="alert" class="alert alert-dismissible ' + (note.resub ? 'bg-primary' : 'alert-info') + ' sub">' +
            button +
            '<div style="white-space: pre;">' +
                '<strong>' + note.name +'</strong>' + (note.resub ? ' - Resub ×' + note.months : '') +
            '</div>' +
        '</div>';
    var $alert  = $(alert);
    $alert.data('note',note);
    $alert.find(".alert-control").on("click", function(e){
        var target = $(e.currentTarget);
        var alert = target.closest('.alert');
        var command = target.data('command');
        var note = alert.data('note');
        note.replay = true;
        if(command == 'resend') {
            nodecg.sendMessage('subscription', note)
        }
    })
    $('#nodecg-beam_sub_list').prepend($alert);
}
function addFollow(note) {
    if(note.replay !== undefined && note.replay) {
        return;
    }
    var alert =
        '<div role="alert" class="alert alert-dismissible ' + (note.resub ? 'bg-primary' : 'alert-info') + ' sub">' +
            button +
            '<div style="white-space: pre;">' +
                '<strong>' + note.name +'</strong>' + (note.resub ? ' - Resub ×' + note.months : '') +
            '</div>' +
        '</div>';
    var $alert  = $(alert);
    $alert.data('note',note);
    $alert.find(".alert-control").on("click", function(e){
        var target = $(e.currentTarget);
        var alert = target.closest('.alert');
        var command = target.data('command');
        var note = alert.data('note');
        note.replay = true;
        if(command == 'resend') {
            nodecg.sendMessage('follow', note)
        }
    })
    $('#nodecg-beam_follow_list').prepend($alert);
}

$('#nodecg-beam_clearall_sub').click(function() {
    $('#nodecg-beam_sub_list').find('.alert').remove();
});
$('#nodecg-beam_clearall_follow').click(function() {
    $('#nodecg-beam_follow_list').find('.alert').remove();
});

$clearLogs.click(function() {
   $logs.children().remove();
});


$test.on("click",function(){
    addFollow({
        name:'Test'+Date.now()
    });
    addSub({
        name:'Test'+Date.now()
    });
})
