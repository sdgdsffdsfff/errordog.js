(function() {
  this.init = function(host, port, root, name) {
    var addr;

    if (root.length > 0) {
      addr = sprintf('http://{0}:{1}/{2}/io/{3}',
                      host, port, root, name);
    } else {
      addr = sprintf('http://{0}:{1}/io/{2}',
                     host, port, name);
    }

    var socket = io(addr);
    var maxCount = 100;
    var curCount = 0;
    var placeholder = $('ul.main li.placeholder');

    socket.on('alert', function(data) {
      $('p.loader').hide();

      var color;
      var child = placeholder.clone();

      switch(data.level) {
        case 0:
          color = 'gray';
          break;
        case 1:
          color = 'yellow';
          break;
        case 2:
          color = 'red';
          break;
      }
      child.attr('class', 'item ' + color);
      child.find('span p.datetime').text(data.datetime.slice(0, 24));
      child.find('span p.message').text(sprintf('({0}) {1} errors in {2} secs',
                                                name, data.count, data.interval));
      child.find('pre code').text(data.lines.join('\n'));
      hljs.highlightBlock(child.find('pre code')[0]);
      $('ul.main').append(child);
      curCount += 1;

      while (curCount > maxCount) {
        $('ul.main li.item').first().remove();
        curCount -= 1;
      }

      $('body').scrollTop($('body')[0].scrollHeight);
    });
  };
})(this);

// help to sprintf a string
function sprintf() {
  var fmt = [].slice.apply(arguments, [0, 1])[0];
  var args = [].slice.apply(arguments, [1]);
  return fmt.replace(/{(\d+)}/g, function(match, idx) {
    return typeof args[idx] != 'undefined'? args[idx] : match;
  });
}
