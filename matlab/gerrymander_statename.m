function outputstring=gerrystatename(foo)

statelist=['AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY '];

sfoo='';
foo=round(foo);
foo=min(foo,50);
if isempty(find(foo==0))
    for i=1:length(foo)
        if bitand(foo(i)>=1,foo(i)<=50)
            ifoo=1+3*(foo(i)-1);
            sfoo=[sfoo statelist(ifoo:ifoo+2)];
        else
            sfoo=[sfoo 'XX '];
        end
    end
else
    sfoo='Custom Data ';
end
outputstring=sfoo;
clear statelist ifoo

end

