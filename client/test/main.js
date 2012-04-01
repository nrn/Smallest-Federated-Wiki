describe('utility.js', function () {
  describe('utility functions', function () {
    it('should make the wiki global object', function () {
      expect(wiki).to.exist;
    });
    it('should get a randomByte()', function () {
      var a = wiki.randomByte();
      expect(a).to.be.a('string');
      expect(a.length).to.be(2);
    });
    it('should get n randomBytes(n)', function () {
      var a = wiki.randomBytes(8);
      expect(a).to.be.a('string');
      expect(a.length).to.be(16);
    });
    it('should slugify a name', function () {
      var a = wiki.asSlug('Welcome Visitors');
      expect(a).to.be('welcome-visitors');
    });
  });
});
