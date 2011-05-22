// load the mindmap
        $(document).ready(function() {
        $('body').mindmap();
            // enable the mindmap in the body
            // add the data to the mindmap
            var root = $('body>ul>li').get(0).mynode = $('body').addRootNode($('body>ul>li>div'), {
//                href:$('body>ul>li>a').attr('href'),
//                url:$('body>ul>li>a').attr('href'),
                onclick:function(node) {
                    $(node.obj.activeNode.content).each(function() {
                        this.hide();
                    });
                }
            });
            $('body>ul>li').hide();
            var addLI = function() {
                var parentnode = $(this).parents('li').get(0);
                if (typeof(parentnode)=='undefined') parentnode=root;
                    else parentnode=parentnode.mynode;
                
                this.mynode = $('body').addNode(parentnode, $('div:eq(0)',this), {
//                    href:$('a:eq(0)',this).text().toLowerCase(),
//                    href:$('a:eq(0)',this).attr('href'),
//                    url:$('a:eq(0)',this).attr('href'),
                    onclick:function(node) {
                        $(node.obj.activeNode.content).each(function() {
                            this.hide();
                        });
                        $(node.content).each(function() {
                            this.show();
                        });
                    }
                });
                $(this).hide();
                $('>ul>li', this).each(addLI);
            };
            $('body>ul>li>ul').each(function() { 
                $('>li', this).each(addLI);
            });
        
        });